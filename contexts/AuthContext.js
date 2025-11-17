import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [isSignedIn, setIsSignedIn] = useState(null); // null = loading

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = await AsyncStorage.getItem('rsToken');
        if (mounted) setIsSignedIn(!!token);
      } catch (e) {
        if (mounted) setIsSignedIn(false);
      }
    })();
    return () => (mounted = false);
  }, []);

  const signIn = async (token, userId) => {
    await AsyncStorage.setItem('rsToken', token);
    await AsyncStorage.setItem('rsUserId', userId);
    setIsSignedIn(true);
  };

  const signOut = async () => {
    await AsyncStorage.removeItem('rsToken');
    await AsyncStorage.removeItem('rsUserId');
    setIsSignedIn(false);
  };

  return (
    <AuthContext.Provider value={{ isSignedIn, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
