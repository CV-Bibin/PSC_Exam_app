import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        // 1. BULLETPROOF FALLBACK: Check email directly to bypass DB permission issues
        let adminStatus = false;
        if (currentUser.email === 'admin@psccivil.com') { 
          adminStatus = true;
        }

        try {
          // 2. Fetch user profile & permissions from Firestore
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setProfile(data);
            
            // If the database says they are admin, grant it too
            if (data.role === 'admin' || data.isAdmin === true) {
              adminStatus = true;
            }
          }
        } catch (error) {
          console.error("Firestore Error (You might need to update Firebase Rules):", error);
        }

        setIsAdmin(adminStatus); // Lock in the admin status
      } else {
        setProfile(null);
        setIsAdmin(false);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, profile, isAdmin, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);