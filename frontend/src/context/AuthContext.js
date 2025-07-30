import React, { createContext, useState, useContext, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
// We no longer need to listen to onAuthStateChanged here, as it's the likely source of the issue.
// The authService will handle Firebase sign-in/sign-out directly.

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // This effect runs only ONCE on app load to initialize auth state from localStorage.
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        // Check if token is expired
        if (decoded.exp * 1000 > Date.now()) {
          // If the token is valid, set the user state
          setUser({ token, role: decoded.role, id: decoded.id });
        } else {
          // Token is expired, remove it
          localStorage.removeItem('authToken');
        }
      } catch (error) {
        console.error("Invalid token on load:", error);
        localStorage.removeItem('authToken');
      }
    }
    // Set loading to false only after the check is complete
    setLoading(false);
  }, []); // The empty dependency array [] ensures this runs only once on mount.

  // This is the function your Login/Signup components will call
  const login = (token) => {
    try {
      const decoded = jwtDecode(token);
      // Store the user object with the token and decoded role/id
      setUser({ token, role: decoded.role, id: decoded.id });
      localStorage.setItem('authToken', token);
    } catch (error) {
      console.error("Failed to decode token on login:", error);
    }
  };

  const logout = () => {
    // This function clears our application's state.
    // The Navbar's handleLogout function is responsible for also calling Firebase's signOut.
    setUser(null);
    localStorage.removeItem('authToken');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {/* Don't render children until the initial loading check is complete */}
      {!loading && children}
    </AuthContext.Provider>
  );
};

// Custom hook to easily use the auth context
export const useAuth = () => {
  return useContext(AuthContext);
};
