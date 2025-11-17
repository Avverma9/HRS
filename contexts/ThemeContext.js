import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

const lightTheme = {
  background: '#ffffff',
  surface: 'rgba(255,255,255,0.6)',
  headerBg: 'rgba(255,255,255,0.6)',
  text: '#0f172a',
  textSecondary: '#64748b',
  iconColor: '#6b7280',
  activeColor: '#2563eb',
  activeBg: '#93c5fd',
  border: 'rgba(255,255,255,0.12)',
  shadow: '#000',
  pillBg: 'rgba(255,255,255,0.6)',
  blurTint: 'light',
  statusBar: 'dark',
};

const darkTheme = {
  background: '#0f172a',
  surface: 'rgba(15,23,42,0.8)',
  headerBg: 'rgba(30,41,59,0.9)',
  text: '#f1f5f9',
  textSecondary: '#94a3b8',
  iconColor: '#cbd5e1',
  activeColor: '#60a5fa',
  activeBg: '#1e40af',
  border: 'rgba(255,255,255,0.1)',
  shadow: '#000',
  pillBg: 'rgba(30,41,59,0.9)',
  blurTint: 'dark',
  statusBar: 'light',
};

export function ThemeProvider({ children }) {
  // Force light-only theme: keep isDark always false and make toggle a no-op.
  const [isDark] = useState(false);

  const toggleTheme = () => {
    // no-op: app will use light theme only
    return;
  };

  const theme = lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
