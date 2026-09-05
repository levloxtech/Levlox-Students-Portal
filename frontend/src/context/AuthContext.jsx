import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { getStudent, getAdmin } from '../services/firebaseService';

const AuthContext = createContext(null);

/** Cache key for the last known profile — used only to avoid a blank first paint. */
const PROFILE_CACHE_KEY = 'levlox_profile_cache';

const readCachedProfile = () => {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Tracks the uid whose profile is currently loaded, so refreshProfile and the
  // auth listener never race each other into writing a mismatched profile.
  const loadedUidRef = useRef(null);

  /** Resolve a signed-in Firebase user to their Firestore profile + role. */
  const resolveProfile = useCallback(async (uid) => {
    // Check admin, trainer, and student in parallel
    const [adminDoc, trainerDoc, studentDoc] = await Promise.all([
      getAdmin(uid).catch(() => null),
      getDocument('trainers', uid).catch(() => null),
      getStudent(uid).catch(() => null),
    ]);

    if (adminDoc) return { profile: adminDoc, role: 'admin' };
    if (trainerDoc) return { profile: trainerDoc, role: trainerDoc.role || 'trainer' };
    if (studentDoc) return { profile: studentDoc, role: studentDoc.role || 'student' };
    return { profile: null, role: null };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        if (!firebaseUser) {
          loadedUidRef.current = null;
          setCurrentUser(null);
          setUserProfile(null);
          setUserRole(null);
          setAuthError(null);
          localStorage.removeItem(PROFILE_CACHE_KEY);
          setAuthLoading(false);
          return;
        }

        setCurrentUser(firebaseUser);

        // Paint immediately from cache when it belongs to this same user; the
        // authoritative read below still runs and overwrites it.
        const cached = readCachedProfile();
        if (cached?.uid === firebaseUser.uid) {
          setUserProfile(cached.profile);
          setUserRole(cached.role);
        }

        try {
          const { profile, role } = await resolveProfile(firebaseUser.uid);

          // A newer auth event may have landed while this awaited — ignore stale results.
          if (auth.currentUser?.uid !== firebaseUser.uid) return;

          loadedUidRef.current = firebaseUser.uid;
          setUserProfile(profile);
          setUserRole(role);
          setAuthError(null);

          if (profile && role) {
            localStorage.setItem(
              PROFILE_CACHE_KEY,
              JSON.stringify({ uid: firebaseUser.uid, profile, role })
            );
          } else {
            // Signed in to Firebase Auth but no matching Firestore record.
            localStorage.removeItem(PROFILE_CACHE_KEY);
            setAuthError('no_profile');
          }
        } catch (err) {
          console.error('[AuthContext] Error loading user profile:', err);
          setAuthError(err?.code || err?.message || 'profile_load_failed');
        } finally {
          setAuthLoading(false);
        }
      },
      (err) => {
        console.error('[AuthContext] Auth state error:', err);
        setAuthError(err?.code || 'auth_state_error');
        setAuthLoading(false);
      }
    );

    return () => unsubscribe();
  }, [resolveProfile]);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('[AuthContext] logout error:', err);
    } finally {
      // Clear locally regardless — a failed network sign-out must not leave the
      // UI showing a signed-in state.
      loadedUidRef.current = null;
      setCurrentUser(null);
      setUserProfile(null);
      setUserRole(null);
      localStorage.removeItem(PROFILE_CACHE_KEY);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return null;
    try {
      const { profile, role } = await resolveProfile(uid);
      if (auth.currentUser?.uid !== uid) return null;

      setUserProfile(profile);
      setUserRole(role);
      if (profile && role) {
        localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({ uid, profile, role }));
      }
      return profile;
    } catch (err) {
      console.error('[AuthContext] refreshProfile error:', err);
      setAuthError(err?.code || 'profile_refresh_failed');
      return null;
    }
  }, [resolveProfile]);

  /** Merge fields into the in-memory profile after a successful Firestore write. */
  const applyProfilePatch = useCallback((patch) => {
    setUserProfile((prev) => {
      const next = { ...(prev || {}), ...patch };
      const uid = auth.currentUser?.uid;
      if (uid) {
        setUserRole((role) => {
          localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({ uid, profile: next, role }));
          return role;
        });
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      currentUser,
      userProfile,
      userRole,
      authLoading,
      authError,
      logout,
      refreshProfile,
      applyProfilePatch,
      isAdmin: userRole === 'admin',
      isTrainer: userRole === 'trainer',
      isStudent: userRole === 'student',
      uid: currentUser?.uid || null,
    }),
    [currentUser, userProfile, userRole, authLoading, authError, logout, refreshProfile, applyProfilePatch]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

export default AuthContext;
