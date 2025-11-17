import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, TextInput, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { router as navigationRouter } from '../utils/navigation';

const SEARCH_MAX_WIDTH = 180;

const Header = () => {
  const insets = useSafeAreaInsets();
  const { theme, isDark, toggleTheme } = useTheme();
  const { signOut } = useAuth();

  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);

  const searchWidth = useRef(new Animated.Value(0)).current;
  const searchOpacity = useRef(new Animated.Value(0)).current;
  const searchInputRef = useRef(null);

  const expandSearch = () => {
    setSearchExpanded(true);
    Animated.parallel([
      Animated.timing(searchWidth, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(searchOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start(() => {
      searchInputRef.current?.focus();
    });
  };

  const collapseSearch = () => {
    Animated.parallel([
      Animated.timing(searchWidth, {
        toValue: 0,
        duration: 180,
        useNativeDriver: false,
      }),
      Animated.timing(searchOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: false,
      }),
    ]).start(() => {
      setSearchExpanded(false);
      setSearchText('');
    });
  };

  const handleLogout = async () => {
    setProfileMenuVisible(false);
    await signOut();
    Toast.show({ type: 'success', text1: 'Logged Out', text2: 'See you soon!', position: 'top' });
    // Let AuthContext state drive root navigation; avoid extra RESET that causes warning
    try {
      navigationRouter.resetRoot([{ name: 'Login' }]);
    } catch (e) {
      try {
        navigationRouter.push('Login');
      } catch (_) {
        // ignore if navigator not ready yet
      }
    }
  };

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top || 8 }]}>
      <BlurView intensity={80} tint={theme.blurTint} style={styles.blur}>
        <View style={[styles.container, { backgroundColor: theme.headerBg }]}
              onLayout={() => { if (searchExpanded && searchWidth._value === 0) searchWidth.setValue(1); }}>
          <View style={styles.left}>
            <View style={[styles.logoMark, { backgroundColor: isDark ? '#1e40af' : '#e6eefc' }]}>
              <Text style={[styles.logoMarkText, { color: theme.text }]}>H</Text>
            </View>
            <Text style={[styles.logoText, { color: theme.text }]}>HRS</Text>
          </View>

          <View style={styles.right}>
            <View style={{ flexDirection: 'row', alignItems: 'center', maxWidth: SEARCH_MAX_WIDTH + 60 }}>
              {searchExpanded && (
                <Animated.View
                  style={{
                    maxWidth: SEARCH_MAX_WIDTH,
                    width: searchWidth.interpolate({ inputRange: [0, 1], outputRange: [0, SEARCH_MAX_WIDTH] }),
                    opacity: searchOpacity,
                    marginRight: 8,
                    overflow: 'hidden',
                  }}
                >
                  <TextInput
                    ref={searchInputRef}
                    value={searchText}
                    onChangeText={setSearchText}
                    placeholder="Search..."
                    placeholderTextColor={theme.textSecondary}
                    style={[styles.searchInput, { color: theme.text, backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}
                    returnKeyType="search"
                    onBlur={collapseSearch}
                  />
                </Animated.View>
              )}

              {!searchExpanded && (
                <TouchableOpacity style={styles.iconBtn} activeOpacity={0.75} onPress={expandSearch}>
                  <Ionicons name="search" size={20} color={theme.iconColor} />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={styles.iconBtn}
              activeOpacity={0.75}
              onPress={() => setProfileMenuVisible(true)}
            >
              <MaterialCommunityIcons
                name="account-circle-outline"
                size={22}
                color={theme.iconColor}
              />
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>

      <Modal
        visible={profileMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setProfileMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setProfileMenuVisible(false)}
        >
          <View style={[styles.menuContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <BlurView intensity={90} tint={theme.blurTint} style={{ borderRadius: 16, overflow: 'hidden' }}>
              <View
                style={{
                  backgroundColor: isDark ? 'rgba(30,41,59,0.95)' : 'rgba(255,255,255,0.95)',
                  padding: 8,
                }}
              >
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setProfileMenuVisible(false);
                  }}
                >
                  <MaterialCommunityIcons name="account" size={20} color={theme.iconColor} />
                  <Text style={[styles.menuText, { color: theme.text }]}>Profile</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem} onPress={toggleTheme}>
                  <MaterialCommunityIcons
                    name={isDark ? 'white-balance-sunny' : 'moon-waning-crescent'}
                    size={20}
                    color={theme.iconColor}
                  />
                  <Text style={[styles.menuText, { color: theme.text }]}>
                    {isDark ? 'Light Mode' : 'Dark Mode'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setProfileMenuVisible(false);
                  }}
                >
                  <MaterialCommunityIcons
                    name="ticket-percent"
                    size={20}
                    color={theme.iconColor}
                  />
                  <Text style={[styles.menuText, { color: theme.text }]}>Coupons</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setProfileMenuVisible(false);
                  }}
                >
                  <MaterialCommunityIcons
                    name="book-open-variant"
                    size={20}
                    color={theme.iconColor}
                  />
                  <Text style={[styles.menuText, { color: theme.text }]}>Bookings</Text>
                </TouchableOpacity>

                <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />

                <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                  <MaterialCommunityIcons name="logout" size={20} color="#ef4444" />
                  <Text style={[styles.menuText, { color: '#ef4444' }]}>Logout</Text>
                </TouchableOpacity>
              </View>
            </BlurView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 12,
    marginTop: 8,
    zIndex: 9999,
  },
  blur: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  left: { flexDirection: 'row', alignItems: 'center' },
  logoMark: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  logoMarkText: { fontWeight: '800', fontSize: 16 },
  logoText: { fontSize: 16, fontWeight: '800' },
  right: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { marginLeft: 10, padding: 6, borderRadius: 10, backgroundColor: 'transparent' },
  searchInput: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: 16,
  },
  menuContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuText: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 12,
  },
  menuDivider: {
    height: 1,
    marginVertical: 4,
  },
});

export default Header;
