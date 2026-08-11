/**
 * Firebase Authentication operations — Levlox Student Portal.
 *
 * Password material never touches Firestore. Everything here goes through
 * Firebase Auth, which stores and verifies credentials on Google's servers.
 */
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { auth } from "../firebase";

/** Human-readable messages for the Auth error codes this app can produce. */
export const describeAuthError = (error) => {
  const code = error?.code || "";
  const map = {
    "auth/wrong-password": "Your current password is incorrect.",
    "auth/invalid-credential": "Your current password is incorrect.",
    "auth/weak-password": "Please choose a stronger password (at least 8 characters).",
    "auth/requires-recent-login": "For security, please sign out and sign in again before changing this.",
    "auth/email-already-in-use": "That email address is already used by another account.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
    "auth/network-request-failed": "Network error. Please check your connection.",
    "auth/user-not-found": "No account found with that email address.",
    "auth/operation-not-allowed": "This operation is not enabled for the project.",
  };
  return map[code] || error?.message || "Something went wrong. Please try again.";
};

/**
 * Password policy enforced in the UI. Firebase itself only requires 6
 * characters, so this is the stricter portal rule.
 * @returns {string|null} an error message, or null when the password is valid
 */
export const validatePasswordStrength = (password) => {
  if (!password || password.length < 8) return "Password must be at least 8 characters long.";
  if (!/[A-Z]/.test(password)) return "Password must include at least one uppercase letter.";
  if (!/[a-z]/.test(password)) return "Password must include at least one lowercase letter.";
  if (!/[0-9]/.test(password)) return "Password must include at least one number.";
  return null;
};

/**
 * Change the signed-in user's password.
 *
 * Firebase requires a recent login for this, so the current password is used to
 * reauthenticate first — that is also what verifies the user actually knows it.
 */
export const changeOwnPassword = async (currentPassword, newPassword) => {
  const user = auth.currentUser;
  if (!user) throw new Error("You are not signed in.");
  if (!user.email) throw new Error("This account has no email address linked.");

  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
  return true;
};

/*
 * Deliberately not provided here:
 *
 *   • sendPasswordResetEmail — sign-in identifiers are derived from the mobile
 *     number and are undeliverable by design, so a reset mail has nowhere to go.
 *     Resets are an administrator action: backend/reset_password.py.
 *   • updateEmail — the identifier IS the identity. Changing it would silently
 *     move the account to a different mobile number. Admins change the mobile
 *     number through the Admin SDK instead.
 */

export default {
  changeOwnPassword,
  validatePasswordStrength,
  describeAuthError,
};
