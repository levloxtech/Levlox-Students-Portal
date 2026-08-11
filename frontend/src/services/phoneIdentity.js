/**
 * Mobile-number identity for Firebase Authentication — Levlox Student Portal.
 *
 * ── Why this exists ────────────────────────────────────────────────────────
 * Firebase offers two relevant sign-in providers, and neither does
 * "mobile number + password" directly:
 *
 *   • Phone Authentication  — SMS one-time codes only. It has no password
 *                             concept at all, so it cannot satisfy the portal's
 *                             mobile + password requirement.
 *   • Email/Password        — a password provider, but keyed by an identifier
 *                             that must be email-shaped.
 *
 * So the portal keeps the Email/Password *provider* (Google stores and verifies
 * the password with scrypt on their servers) but derives the identifier from
 * the student's mobile number instead of asking for an email address.
 *
 * The mapping is deterministic and computed locally:
 *
 *     9876543210  ->  9876543210@phone.levlox.invalid
 *
 * Properties that matter:
 *   • The password is never seen, stored or hashed by this application. It goes
 *     straight to Firebase Authentication, exactly as with email sign-in.
 *   • Nothing about credentials is written to Firestore.
 *   • No lookup service is needed, so there is no endpoint that would let an
 *     attacker enumerate which mobile numbers are registered.
 *   • Firebase Auth enforces uniqueness on the identifier, which means mobile
 *     numbers are unique across the portal for free.
 *   • Security is identical to email sign-in: knowing someone's identifier
 *     (their mobile number) is useless without their password.
 *
 * `.invalid` is reserved by RFC 2606 and can never resolve, so these addresses
 * are guaranteed undeliverable — no mail can ever be sent to one by accident.
 * The consequence is that Firebase's "send password reset email" flow does not
 * apply; password resets are an administrator action (see
 * backend/reset_password.py), which is how this portal already worked.
 */

/** Domain used to build the Firebase Auth identifier. Never receives mail. */
export const PHONE_AUTH_DOMAIN = 'phone.levlox.invalid';

/** Indian mobile numbers: 10 digits, first digit 6-9. */
const NATIONAL_NUMBER_LENGTH = 10;

/**
 * Reduce any way a user might type their number to one canonical form.
 *
 * Accepts "9876543210", "+91 98765 43210", "098765-43210", "091-9876543210".
 *
 * @returns {string|null} the 10-digit national number, or null if unusable
 */
export const normalizeMobile = (input) => {
  if (!input) return null;

  const digits = String(input).replace(/\D/g, '');
  if (digits.length < NATIONAL_NUMBER_LENGTH) return null;

  // Trailing 10 digits drops a +91 / 91 / 0 prefix without special-casing each.
  const national = digits.slice(-NATIONAL_NUMBER_LENGTH);

  // Guard against a longer string whose tail merely looks like a mobile number.
  if (digits.length > NATIONAL_NUMBER_LENGTH + 3) return null;
  if (!/^[6-9]\d{9}$/.test(national)) return null;

  return national;
};

/** True when the input can be used as a mobile number. */
export const isValidMobile = (input) => normalizeMobile(input) !== null;

/**
 * Build the Firebase Auth identifier for a mobile number.
 *
 * @param {string} input raw or normalized mobile number
 * @returns {string} the identifier to pass to Firebase Auth
 * @throws {Error} if the number is not a valid mobile number
 */
export const mobileToAuthId = (input) => {
  const national = normalizeMobile(input);
  if (!national) throw new Error('Please enter a valid 10-digit mobile number.');
  return `${national}@${PHONE_AUTH_DOMAIN}`;
};

/** Recover the mobile number from an auth identifier (for display). */
export const authIdToMobile = (authId) => {
  if (typeof authId !== 'string' || !authId.endsWith(`@${PHONE_AUTH_DOMAIN}`)) return null;
  return authId.slice(0, -(PHONE_AUTH_DOMAIN.length + 1)) || null;
};

/** Format a number for display: 98765 43210. */
export const formatMobile = (input) => {
  const national = normalizeMobile(input);
  if (!national) return input || '';
  return `${national.slice(0, 5)} ${national.slice(5)}`;
};

export default {
  PHONE_AUTH_DOMAIN,
  normalizeMobile,
  isValidMobile,
  mobileToAuthId,
  authIdToMobile,
  formatMobile,
};
