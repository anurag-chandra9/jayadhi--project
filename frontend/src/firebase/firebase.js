import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBhCvhFPTj8cTWjCAzVN5cp_VIWxYLkB90",
  authDomain: "login-form-b0bd4.firebaseapp.com",
  projectId: "login-form-b0bd4",
  storageBucket: "login-form-b0bd4.appspot.com",
  messagingSenderId: "230052475095",
  appId: "1:230052475095:web:ab16ea41b7b23d1f0ec092"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
