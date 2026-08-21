/**
 * Firebase initialization — Levlox Student Portal.
 *
 * This is the ONLY place `initializeApp` is called. Every other module must
 * import `auth`, `db` or `storage` from here so a single app instance is reused.
 */
import { initializeApp, getApps, getApp, deleteApp } from "firebase/app";
import {
  getAuth,
  browserLocalPersistence,
  setPersistence,
  initializeAuth,
  connectAuthEmulator,
} from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Surface a clear message instead of an opaque Firebase error when the
// deployment is missing its environment variables.
const missingKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingKeys.length > 0) {
  console.error(
    `[Firebase] Missing configuration: ${missingKeys.join(", ")}. ` +
      `Set the matching VITE_FIREBASE_* environment variables.`
  );
}

// Reuse the existing app across HMR reloads instead of initializing twice.
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

/*
 * Local development against the Firebase Emulator Suite.
 *
 * Opt in with VITE_USE_FIREBASE_EMULATOR=true in frontend/.env.local. Production
 * builds never set it, so this branch is dead code there. Emulators run the same
 * Auth and Firestore behaviour locally without touching the live project.
 */
const USE_EMULATOR = import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true';
const EMULATOR_AUTH_URL = import.meta.env.VITE_EMULATOR_AUTH_URL || 'http://127.0.0.1:9099';

if (USE_EMULATOR) {
  const firestoreHost = import.meta.env.VITE_EMULATOR_FIRESTORE_HOST || '127.0.0.1';
  const firestorePort = Number(import.meta.env.VITE_EMULATOR_FIRESTORE_PORT || 8080);

  connectAuthEmulator(auth, EMULATOR_AUTH_URL, { disableWarnings: true });
  connectFirestoreEmulator(db, firestoreHost, firestorePort);
  console.info(`[Firebase] Using local emulators — Auth ${EMULATOR_AUTH_URL}, Firestore ${firestoreHost}:${firestorePort}`);
}

// Keep the session across reloads/tabs. Fire-and-forget: onAuthStateChanged
// still resolves correctly if this rejects (e.g. storage blocked in private mode).
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn("[Firebase] Could not set local auth persistence:", err?.code || err);
});

/**
 * Create a user without disturbing the currently signed-in session.
 *
 * `createUserWithEmailAndPassword` signs the new account in on whichever Auth
 * instance it is given, which would silently log an admin out of their own
 * dashboard. Running it on a short-lived secondary app keeps the admin session
 * on the primary instance untouched.
 *
 * @returns {Promise<string>} the new user's uid
 */
export const createAuthUserDetached = async (email, password) => {
  const secondaryApp = initializeApp(firebaseConfig, `secondary-${Date.now()}`);
  try {
    // initializeAuth with no persistence — nothing is written to local storage.
    const secondaryAuth = initializeAuth(secondaryApp, {});

    // The secondary app is a separate Firebase instance and does NOT inherit the
    // primary app's emulator wiring. Without this it would create real accounts
    // in the production project while developing locally.
    if (USE_EMULATOR) {
      connectAuthEmulator(secondaryAuth, EMULATOR_AUTH_URL, { disableWarnings: true });
    }

    const { createUserWithEmailAndPassword, signInWithEmailAndPassword } = await import("firebase/auth");
    let uid;

    try {
      const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      uid = credential.user.uid;
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        // If Auth account exists (e.g. from previously deleted Firestore record),
        // try signing in to recover the existing user's UID.
        try {
          const credential = await signInWithEmailAndPassword(secondaryAuth, email, password);
          uid = credential.user.uid;
        } catch {
          // If sign-in fails (e.g. different password), throw original error
          throw err;
        }
      } else {
        throw err;
      }
    }

    await secondaryAuth.signOut().catch(() => null);
    return uid;
  } finally {
    await deleteApp(secondaryApp).catch(() => null);
  }
};

export default app;
