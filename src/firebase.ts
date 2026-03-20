import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "missing-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "missing-auth-domain",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "missing-project-id",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "missing-storage-bucket",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "missing-sender-id",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "missing-app-id",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
  if (firebaseConfig.apiKey === "missing-api-key") {
    alert("Firebase is not configured! Please create a .env.local file with your Firebase credentials as shown in .env.example to enable login.");
    return;
  }
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (error: any) {
    // Ignore popup-closed-by-user errors (user just closed the popup)
    if (error?.code !== 'auth/popup-closed-by-user') {
      console.error('Login failed:', error);
      alert('Login failed. Please try again.');
    }
  }
};
export const logout = () => signOut(auth);
