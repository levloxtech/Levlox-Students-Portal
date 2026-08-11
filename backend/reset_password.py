"""
Administrator password reset — Levlox Student Portal.

Why this is a CLI and not a button in the dashboard:

  * Sign-in identifiers are derived from the mobile number and are deliberately
    undeliverable addresses, so Firebase's "send password reset email" flow has
    nowhere to send to.
  * Setting *another* user's password requires the Firebase Admin SDK. Admin
    credentials must never be shipped to the browser, so this cannot be done
    from the dashboard without exposing them.

Run it from a trusted machine that holds the service-account JSON.

The new password is set in Firebase Authentication. Nothing about it is written
to Firestore — only the `mustChangePassword` flag, which forces the account
holder to choose their own password the next time they sign in.

Usage:
    python reset_password.py --mobile 9876543210 --password "<new-temp-password>"
    python reset_password.py --mobile 9876543210 --password "<pw>" --no-force-change
"""

import argparse
import sys

import firebase_init
from firebase_admin import auth as firebase_auth
from firebase_admin import firestore

from phone_identity import mobile_to_auth_id, normalize_mobile

MIN_PASSWORD_LENGTH = 8


def reset_password(mobile: str, password: str, force_change: bool = True) -> None:
    if not firebase_init.firebase_initialized or firebase_init.db_firestore is None:
        sys.exit(
            "Firebase Admin SDK is not initialized. Set FIREBASE_SERVICE_ACCOUNT "
            "(path to the service-account JSON) or FIREBASE_CREDENTIALS_JSON and retry."
        )

    national = normalize_mobile(mobile)
    if not national:
        sys.exit(f"'{mobile}' is not a valid 10-digit mobile number.")

    if len(password) < MIN_PASSWORD_LENGTH:
        sys.exit(f"Password must be at least {MIN_PASSWORD_LENGTH} characters.")

    try:
        user = firebase_auth.get_user_by_email(mobile_to_auth_id(national))
    except firebase_auth.UserNotFoundError:
        sys.exit(f"No portal account is registered with mobile number {national}.")

    firebase_auth.update_user(user.uid, password=password)
    print(f"Password updated for {national} (uid={user.uid}).")

    if force_change:
        db = firestore.client()
        # Only students carry the temporary-password lock; admins are exempt.
        student_ref = db.collection("students").document(user.uid)
        if student_ref.get().exists:
            student_ref.update({
                "mustChangePassword": True,
                "updatedAt": firestore.SERVER_TIMESTAMP,
            })
            print("Student must choose a new password at next sign-in.")
        else:
            print("No student record for this account — skipped the change-password flag.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Reset a Levlox portal account password.")
    parser.add_argument("--mobile", required=True, help="Account mobile number (10 digits)")
    parser.add_argument("--password", required=True, help="New temporary password")
    parser.add_argument(
        "--no-force-change",
        action="store_true",
        help="Do not require the holder to change this password at next sign-in",
    )
    args = parser.parse_args()

    reset_password(
        mobile=args.mobile,
        password=args.password,
        force_change=not args.no_force_change,
    )


if __name__ == "__main__":
    main()
