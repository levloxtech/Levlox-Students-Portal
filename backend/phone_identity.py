"""
Mobile-number identity helpers — must stay in sync with the frontend module
`frontend/src/services/phoneIdentity.js`.

The portal signs users in with a mobile number and a password. Firebase's Phone
Authentication provider is SMS/OTP-only and has no password concept, so the
Email/Password provider is used with a deterministic identifier derived from the
mobile number:

    9876543210  ->  9876543210@phone.levlox.invalid

Firebase Authentication stores and verifies the password itself. No password or
password hash is ever written to Firestore.

`.invalid` is reserved by RFC 2606, so these addresses can never receive mail.
"""

import re

PHONE_AUTH_DOMAIN = "phone.levlox.invalid"
NATIONAL_NUMBER_LENGTH = 10


def normalize_mobile(value: str | None) -> str | None:
    """
    Reduce any accepted input format to the canonical 10-digit national number.

    Accepts "9876543210", "+91 98765 43210", "098765-43210".
    Returns None when the input cannot be a valid mobile number.
    """
    if not value:
        return None

    digits = re.sub(r"\D", "", str(value))
    if len(digits) < NATIONAL_NUMBER_LENGTH:
        return None
    if len(digits) > NATIONAL_NUMBER_LENGTH + 3:
        return None

    national = digits[-NATIONAL_NUMBER_LENGTH:]
    if not re.fullmatch(r"[6-9]\d{9}", national):
        return None

    return national


def mobile_to_auth_id(value: str) -> str:
    """Build the Firebase Auth identifier for a mobile number."""
    national = normalize_mobile(value)
    if not national:
        raise ValueError(f"'{value}' is not a valid 10-digit mobile number.")
    return f"{national}@{PHONE_AUTH_DOMAIN}"


def auth_id_to_mobile(auth_id: str | None) -> str | None:
    """Recover the mobile number from an auth identifier."""
    suffix = f"@{PHONE_AUTH_DOMAIN}"
    if not auth_id or not auth_id.endswith(suffix):
        return None
    return auth_id[: -len(suffix)] or None
