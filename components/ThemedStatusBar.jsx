import React, { useEffect } from 'react';
import { Platform, StatusBar as RNStatusBar } from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { useTheme } from '../contexts/ThemeContext';

export default function ThemedStatusBar({ translucent = true }) {
  const { theme } = useTheme();

  useEffect(() => {
    // Map theme.statusBar (light/dark) to RN bar style values
    const rnBarStyle = theme.statusBar === 'light' ? 'light-content' : 'dark-content';

    if (Platform.OS === 'android') {
      // set backgroundColor for Android status bar
      RNStatusBar.setBackgroundColor(theme.headerBg || theme.background, true);
      RNStatusBar.setTranslucent(!!translucent);
      RNStatusBar.setBarStyle(rnBarStyle);
    } else {
      // On iOS, expo StatusBar will handle the style
      RNStatusBar.setBarStyle(rnBarStyle);
    }
  }, [theme, translucent]);

  return (
    <ExpoStatusBar style={theme.statusBar} backgroundColor={theme.headerBg || theme.background} translucent={translucent} />
  );
}
