// src/firebase/firebase.js
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCy5JNECqcl_ez2XVfPfC1PEetOOwQM1oQ",
  authDomain: "jayadhi-cybersecurity-backend.firebaseapp.com",
  databaseURL: "https://jayadhi-cybersecurity-backend-default-rtdb.firebaseio.com",
  projectId: "jayadhi-cybersecurity-backend",
  storageBucket: "jayadhi-cybersecurity-backend.firebasestorage.app",
  messagingSenderId: "798481900708",
  appId: "1:798481900708:web:8b97a5f98ecca5bff07231",
  measurementId: "G-N9H7ZK62YT"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

class AuthService {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || process.env.REACT_APP_BACKEND_URL || '';
    this.currentUser = null;
    this.idToken = null;
  }

  async loginWithBackend(email, password) {
    try {
      const response = await fetch(`${this.baseURL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Login failed');

      await signInWithCustomToken(auth, data.customToken);

      return new Promise((resolve, reject) => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
          if (user) {
            unsubscribe();
            const token = await user.getIdToken(true);
            this.currentUser = user;
            this.idToken = token;
            resolve({ success: true, user, token, backendData: data });
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

  async loginWithFirebase(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const idToken = await user.getIdToken();

      const response = await fetch(`${this.baseURL}/auth/firebase-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      });

      const data = await response.json();
      if (!response.ok) {
        await signOut(auth);
        throw new Error(data.message || 'Backend validation failed');
      }

      return { success: true, user, backendData: data };
    } catch (error) {
      console.error('Firebase login error:', error);
      throw error;
    }
  }

  async register(username, email, password) {
    try {
      const response = await fetch(`${this.baseURL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Registration failed');

      return await this.loginWithFirebase(email, password);
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  async makeAuthenticatedRequest(url, options = {}) {
    if (!this.idToken) throw new Error('No authentication token available');

    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.idToken}`,
        ...options.headers
      }
    };

    const response = await fetch(`${this.baseURL}${url}`, {
      ...options,
      ...defaultOptions
    });

    if (response.status === 401 && this.currentUser) {
      try {
        this.idToken = await this.currentUser.getIdToken(true);
        defaultOptions.headers.Authorization = `Bearer ${this.idToken}`;
        return await fetch(`${this.baseURL}${url}`, {
          ...options,
          ...defaultOptions
        });
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        throw new Error('Authentication expired. Please login again.');
      }
    }

    return response;
  }

  async getIdToken() {
    if (this.currentUser) return await this.currentUser.getIdToken();
    return null;
  }

  async logout() {
    try {
      if (this.currentUser) {
        await fetch(`${this.baseURL}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ firebaseUid: this.currentUser.uid })
        });
      }

      await signOut(auth);
      this.currentUser = null;
      this.idToken = null;
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }
}

const authService = new AuthService();

export { AuthService, authService, auth, db, app };
