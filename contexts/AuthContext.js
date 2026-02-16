import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearAuthSession, saveAuthSession } from '../utils/credentials';

const AuthContext = createContext();
const AUTH_TOKEN_READ_TIMEOUT_MS = 6000;

const readTokenWithTimeout = () =>
  Promise.race([
    AsyncStorage.getItem('rsToken'),
    new Promise((resolve) => setTimeout(() => resolve(null), AUTH_TOKEN_READ_TIMEOUT_MS)),
  ]);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [isSignedIn, setIsSignedIn] = useState(null); // null = loading

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = await readTokenWithTimeout();
        if (mounted) setIsSignedIn(!!token);
      } catch (e) {
        if (mounted) setIsSignedIn(false);
      }
    })();
    return () => (mounted = false);
  }, []);

  const signIn = async (token, userId, email) => {
    await saveAuthSession({ token, userId, email });
    setIsSignedIn(true);
  };

  const signOut = async () => {
    await clearAuthSession();
    setIsSignedIn(false);
  };

  return (
    <AuthContext.Provider value={{ isSignedIn, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
