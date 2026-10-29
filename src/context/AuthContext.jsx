import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // 🚀 Cloud Sync States (Replaces localStorage for progress)
  const [completedDays, setCompletedDays] = useState([]);
  const [dailyCompletionsLog, setDailyCompletionsLog] = useState({});
  const [globalScores, setGlobalScores] = useState([]);
  const [completedExams, setCompletedExams] = useState([]);
  const [mistakes, setMistakes] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        let adminStatus = false;
        if (currentUser.email === 'admin@psccivil.com') { 
          adminStatus = true;
        }

        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const data = userDoc.data();
            setProfile(data);
            
            if (data.role === 'admin' || data.isAdmin === true) {
              adminStatus = true;
            }

            // Load progress from Firestore (with fallbacks to empty states)
            setCompletedDays(data.completedDays || []);
            setDailyCompletionsLog(data.dailyCompletionsLog || {});
            setGlobalScores(data.globalScores || []);
            setCompletedExams(data.completedExams || []);
            setMistakes(data.mistakes || []);
          } else {
            // 🚀 Initialize new user document in Firestore if it doesn't exist yet
            const initialData = {
              email: currentUser.email,
              displayName: currentUser.displayName || currentUser.email.split('@')[0],
              createdAt: new Date().toISOString(),
              completedDays: [],
              dailyCompletionsLog: {},
              globalScores: [],
              completedExams: [],
              mistakes: []
            };
            await setDoc(userDocRef, initialData);
            setProfile(initialData);
          }
        } catch (error) {
          console.error("Firestore Error syncing user profile:", error);
        }

        setIsAdmin(adminStatus);
      } else {
        setProfile(null);
        setIsAdmin(false);
        setCompletedDays([]);
        setDailyCompletionsLog({});
        setGlobalScores([]);
        setCompletedExams([]);
        setMistakes([]);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 🚀 Universal cloud updater function to save progress changes back to Firestore
  // 🚀 Universal cloud updater function to save progress changes back to Firestore
  const updateCloudProgress = async (newProgressData) => {
    if (!user) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      
      // Update local array states immediately for zero-latency UI response
      if (newProgressData.completedDays !== undefined) setCompletedDays(newProgressData.completedDays);
      if (newProgressData.dailyCompletionsLog !== undefined) setDailyCompletionsLog(newProgressData.dailyCompletionsLog);
      if (newProgressData.globalScores !== undefined) setGlobalScores(newProgressData.globalScores);
      if (newProgressData.completedExams !== undefined) setCompletedExams(newProgressData.completedExams);
      if (newProgressData.mistakes !== undefined) setMistakes(newProgressData.mistakes);

      // Persist changes to Firestore backend
      await updateDoc(userDocRef, newProgressData);

      // 🚀 THE FIX: Instantly update the profile state for Vault/Highlights so the UI updates without a refresh
      setProfile(prevProfile => ({
        ...prevProfile,
        ...newProgressData
      }));

    } catch (error) {
      console.error("Failed to sync progress to Firestore:", error);
    }
  };

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      isAdmin, 
      logout, 
      loading,
      completedDays,
      dailyCompletionsLog,
      globalScores,
      completedExams,
      mistakes,
      updateCloudProgress
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);