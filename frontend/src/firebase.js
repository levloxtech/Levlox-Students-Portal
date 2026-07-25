import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const isFirebaseConfigured = apiKey && apiKey !== "PLACEHOLDER_API_KEY";

const firebaseConfig = {
  apiKey: apiKey || "PLACEHOLDER_API_KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "levlox-student-portal.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "levlox-student-portal",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "levlox-student-portal.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "PLACEHOLDER_SENDER_ID",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "PLACEHOLDER_APP_ID"
};

const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : null;

