// src/context/AuthContext.js (FINAL FIXED + FORCE LOGOUT ON LOAD)
import React, { createContext, useEffect, useState, useContext } from 'react';
import { getAuth, onAuthStateChanged, setPersistence, browserSessionPersistence } from 'firebase/auth';
import { app, authService } from '../firebase/firebase';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const auth = getAuth(app);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 🔥 TEMP FIX: Force logout on app load to clear stale Firebase session
    auth.signOut().then(() => {
      console.log('🧹 Forced logout on load to reset old session');
    });

    setPersistence(auth, browserSessionPersistence)
      .then(() => {
        console.log('🔐 Auth set to session-only');
      })
      .catch((error) => {
        console.error('Persistence error:', error);
      });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("🔄 Firebase User changed:", user);

      if (user) {
        const token = await user.getIdToken(true);
        authService.currentUser = user;
        authService.idToken = token;
        setIsLoggedIn(true);
        setUser(user);
      } else {
        authService.currentUser = null;
        authService.idToken = null;
        setIsLoggedIn(false);
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth]);

  return (
    <AuthContext.Provider value={{ isLoggedIn, user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);