// Firebase Client-side Authentication Example
// This would typically be in your frontend application

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBhCvhFPTj8cTWjCAzVN5cp_VIWxYLkB90",
  authDomain: "jayadhi-cybersecurity-backend.firebaseapp.com",
  databaseURL: "https://jayadhi-cybersecurity-backend-default-rtdb.firebaseio.com",
  projectId: "jayadhi-cybersecurity-backend",
  storageBucket: "jayadhi-cybersecurity-backend.appspot.com",
  messagingSenderId: "798481900708",
  appId: "1:798481900708:web:8b97a5f98ecca5bff07231",
  measurementId: "G-N9H7ZK62YT"
};



// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

class AuthService {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000';
    this.currentUser = null;
    this.idToken = null;

    // Listen for auth state changes
    onAuthStateChanged(auth, (user) => {
      this.currentUser = user;
      if (user) {
        // Get fresh ID token
        user.getIdToken().then(token => {
          this.idToken = token;
          console.log('User signed in:', user.email);
        });
      } else {
        this.idToken = null;
        console.log('User signed out');
      }
    });
  }

  // Add method to expose onAuthStateChanged
  onAuthStateChanged(callback) {
    return onAuthStateChanged(auth, callback);
  }

  // Method 1: Login with custom token (using your backend)
  async loginWithBackend(email, password) {
    try {
      const response = await fetch(`${this.baseURL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Sign in with the custom token
      await signInWithCustomToken(auth, data.customToken);

      // 🔥 Wait until Firebase finishes setting user context
      return new Promise((resolve, reject) => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (user) {
            unsubscribe(); // stop listening
            const token = await user.getIdToken(true); // force refresh
            this.currentUser = user;
            this.idToken = token;

            // console.log('✅ Final ID Token:', token);
            resolve({
              success: true,
              user,
              token,
              backendData: data
            });
          } else {
            reject(new Error('User not signed in'));
          }
        });
      });
    } catch (error) {
      console.error('Backend login error:', error);
      throw error;
    }
  }

  // Method 2: Direct Firebase login then validate with backend
  async loginWithFirebase(email, password) {
    try {
      // Sign in directly with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Get ID token
      const idToken = await user.getIdToken();

      // Validate with your backend
      const response = await fetch(`${this.baseURL}/auth/firebase-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken })
      });

      const data = await response.json();

      if (!response.ok) {
        // Sign out from Firebase if backend validation fails
        await signOut(auth);
        throw new Error(data.message || 'Backend validation failed');
      }

      return {
        success: true,
        user: user,
        backendData: data
      };
    } catch (error) {
      console.error('Firebase login error:', error);
      throw error;
    }
  }

  // Register new user
  async register(username, email, password) {
    try {
      const response = await fetch(`${this.baseURL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      // After successful registration, you can login
      return await this.loginWithFirebase(email, password);
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  // FIXED: Make authenticated API calls with proper FormData handling
  async makeAuthenticatedRequest(url, options = {}) {
    if (!this.idToken) {
      throw new Error('No authentication token available');
    }

    // Check if body is FormData
    const isFormData = options.body instanceof FormData;
    
    // Prepare headers - don't set Content-Type for FormData
    const headers = {
      'Authorization': `Bearer ${this.idToken}`,
      ...options.headers
    };

    // Only set Content-Type to application/json if it's NOT FormData
    if (!isFormData && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    // If it's FormData, remove any Content-Type header to let browser set it
    if (isFormData && headers['Content-Type']) {
      delete headers['Content-Type'];
    }

    // console.log('🚀 Making request to:', `${this.baseURL}${url}`);
    // console.log('📋 Headers:', headers);
    // console.log('📦 Body type:', isFormData ? 'FormData' : typeof options.body);

    const response = await fetch(`${this.baseURL}${url}`, {
      ...options,
      headers
    });

    if (response.status === 401) {
      // Token might be expired, try to refresh
      if (this.currentUser) {
        try {
          this.idToken = await this.currentUser.getIdToken(true); // Force refresh
          // Update the authorization header
          headers.Authorization = `Bearer ${this.idToken}`;
          
          // Retry the request with new token
          return await fetch(`${this.baseURL}${url}`, {
            ...options,
            headers
          });
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          throw new Error('Authentication expired. Please login again.');
        }
      }
    }

    // console.log('📡 Response status:', response.status);
    return response;
  }

  // Get current user's ID token
  async getIdToken() {
    if (this.currentUser) {
      return await this.currentUser.getIdToken();
    }
    return null;
  }

  // Logout
  async logout() {
    try {
      // Notify backend (optional)
      if (this.currentUser) {
        await fetch(`${this.baseURL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ firebaseUid: this.currentUser.uid })
        });
      }

      // Sign out from Firebase
      await signOut(auth);

      this.currentUser = null;
      this.idToken = null;

      console.log('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }
}

// Usage examples:
const authService = new AuthService();

// Example: Login
// async function handleLogin(email, password) {
//   try {
//     const result = await authService.loginWithBackend(email, password);
//     console.log('Login successful:', result);

//     // Now you can make authenticated requests
//     const dashboardResponse = await authService.makeAuthenticatedRequest('/api/waf/dashboard');
//     const dashboardData = await dashboardResponse.json();
//     console.log('Dashboard data:', dashboardData);
//   } catch (error) {
//     console.error('Login failed:', error.message);
//   }
// }

// Example: Register
// async function handleRegister(username, email, password) {
//   try {
//     const result = await authService.register(username, email, password);
//     console.log('Registration successful:', result);
//   } catch (error) {
//     console.error('Registration failed:', error.message);
//   }
// }

// Example: Make authenticated API call
// async function fetchWAFDashboard() {
//   try {
//     const response = await authService.makeAuthenticatedRequest('/api/waf/dashboard');

//     if (response.ok) {
//       const data = await response.json();
//       console.log('WAF Dashboard data:', data);
//       return data;
//     } else {
//       const error = await response.json();
//       throw new Error(error.message || 'Failed to fetch dashboard');
//     }
//   } catch (error) {
//     console.error('Failed to fetch WAF dashboard:', error.message);
//   }
// }

const db = getFirestore(app);

// Export for use in your application - including onAuthStateChanged
export { AuthService, authService, auth, db, onAuthStateChanged,app };