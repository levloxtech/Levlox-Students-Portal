import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { getStudent, getAdmin } from '../services/firebaseService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setCurrentUser(null);
        setUserProfile(null);
        setUserRole(null);
        // Clear legacy localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setAuthLoading(false);
        return;
      }

      try {
        setCurrentUser(firebaseUser);

        // Try admin first (smaller collection), then student
        const [adminDoc, studentDoc] = await Promise.all([
          getAdmin(firebaseUser.uid).catch(() => null),
          getStudent(firebaseUser.uid).catch(() => null),
        ]);

        let profile = null;
        let role = null;

        if (adminDoc) {
          profile = adminDoc;
          role = 'admin';
        } else if (studentDoc) {
          profile = studentDoc;
          role = studentDoc.role || 'student';
        }

        setUserProfile(profile);
        setUserRole(role);

        // Keep localStorage in sync for legacy code paths still reading it
        if (profile) {
          localStorage.setItem('user', JSON.stringify({ ...profile, role }));
        }
        // Store Firebase ID token
        const idToken = await firebaseUser.getIdToken();
        localStorage.setItem('token', idToken);
      } catch (err) {
        console.error('[AuthContext] Error loading user profile:', err);
        setAuthError(err.message);
        setUserProfile(null);
        setUserRole(null);
      } finally {
        setAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } catch (err) {
      console.error('[AuthContext] logout error:', err);
    }
  };

  const refreshProfile = async () => {
    if (!currentUser) return;
    try {
      const [adminDoc, studentDoc] = await Promise.all([
        getAdmin(currentUser.uid).catch(() => null),
        getStudent(currentUser.uid).catch(() => null),
      ]);
      const profile = adminDoc || studentDoc;
      const role = adminDoc ? 'admin' : (studentDoc?.role || 'student');
      setUserProfile(profile);
      setUserRole(role);
      if (profile) {
        localStorage.setItem('user', JSON.stringify({ ...profile, role }));
      }
    } catch (err) {
      console.error('[AuthContext] refreshProfile error:', err);
    }
  };

  const value = {
    currentUser,
    userProfile,
    userRole,
    authLoading,
    authError,
    logout,
    refreshProfile,
    isAdmin: userRole === 'admin',
    isStudent: userRole === 'student',
    uid: currentUser?.uid || null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

export default AuthContext;
