import { initializeApp } from "firebase/app";
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAeyH4IaCXCGTXZzS2teLxI-yCo6JpgKEg",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "housepointsapp-d0be7.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "housepointsapp-d0be7",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "housepointsapp-d0be7.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "12662450844",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:12662450844:web:0f6981dbffb18a6c801b59",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export function logOut() {
  return signOut(auth);
}

export { onAuthStateChanged };
