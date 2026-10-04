import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyArGaSg6ZIdyVV9BN_Ng9fCXw-kbet6jt8",
  authDomain: "psc-civil-5a96f.firebaseapp.com",
  databaseURL: "https://psc-civil-5a96f-default-rtdb.firebaseio.com",
  projectId: "psc-civil-5a96f",
  storageBucket: "psc-civil-5a96f.firebasestorage.app",
  messagingSenderId: "789369461593",
  appId: "1:789369461593:web:71d805eb692e0a4acb4a48"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the specific services we need for the Gamified Prep Engine
export const auth = getAuth(app);         // For Login/Signup
export const db = getFirestore(app);      // For the AI Question Bank, Purgatory, and User XP
export const realtimeDb = getDatabase(app); // For live leaderboards (optional future use)