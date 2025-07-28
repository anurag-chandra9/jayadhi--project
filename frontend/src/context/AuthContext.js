// src/context/AuthContext.js (FINAL FIXED - REMOVED FORCE LOGOUT)
import React, { createContext, useEffect, useState, useContext } from 'react';
import { getAuth, onAuthStateChanged, setPersistence, browserSessionPersistence } from 'firebase/auth';
import { app, authService } from '../firebase/firebase';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const auth = getAuth(app);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [userClaims, setUserClaims] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 🔥 TEMP FIX: Forced logout on app load has been REMOVED.
    // This was causing immediate logouts after successful login.
    // auth.signOut().then(() => {
    //   console.log('🧹 Forced logout on load to reset old session');
    // }); // <--- THIS LINE HAS BEEN REMOVED

    setPersistence(auth, browserSessionPersistence)
      .then(() => {
        console.log('🔐 Auth set to session-only');
      })
      .catch((error) => {
        console.error('Persistence error:', error);
      });

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log("🔄 Firebase User changed:", currentUser);

      if (currentUser) {
        const token = await currentUser.getIdToken(true); // Force refresh token to get latest claims
        const idTokenResult = await currentUser.getIdTokenResult(true);
        
        authService.currentUser = currentUser;
        authService.idToken = token;
        setIsLoggedIn(true);
        setUser(currentUser);
        setUserClaims(idTokenResult.claims);
        console.log("AuthContext: User claims loaded:", idTokenResult.claims);
      } else {
        authService.currentUser = null;
        authService.idToken = null;
        setIsLoggedIn(false);
        setUser(null);
        setUserClaims(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth]);

  return (
    <AuthContext.Provider value={{ isLoggedIn, user, userClaims, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);